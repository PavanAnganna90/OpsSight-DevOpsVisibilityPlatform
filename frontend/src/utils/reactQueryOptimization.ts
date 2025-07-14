/**
 * React Query Optimization Utilities
 * Advanced caching strategies and performance optimizations for React Query
 */

import { 
  QueryClient, 
  useQuery, 
  useMutation, 
  useQueryClient, 
  UseQueryOptions,
  UseMutationOptions,
  QueryKey,
  InfiniteData,
  useInfiniteQuery
} from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';

// Query client configuration with optimized settings
export const createOptimizedQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // React 19 optimizations
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
        retry: (failureCount, error: any) => {
          // Smart retry logic
          if (error?.status === 404) return false;
          if (error?.status >= 500) return failureCount < 3;
          return failureCount < 1;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: false,
        refetchOnMount: 'always',
        refetchOnReconnect: 'always',
        // Enable background refetching
        refetchInterval: false,
        refetchIntervalInBackground: false,
      },
      mutations: {
        retry: 1,
        retryDelay: 1000,
      },
    },
  });
};

// Performance-optimized query keys factory
export const createQueryKeys = {
  all: ['queries'] as const,
  
  // Dashboard queries
  dashboard: () => [...createQueryKeys.all, 'dashboard'] as const,
  dashboardData: (filters?: Record<string, any>) => 
    [...createQueryKeys.dashboard(), 'data', filters] as const,
  
  // DevOps metrics
  metrics: () => [...createQueryKeys.all, 'metrics'] as const,
  metricsTimeseries: (timeRange: string, metric: string) =>
    [...createQueryKeys.metrics(), 'timeseries', timeRange, metric] as const,
  metricsAggregated: (timeRange: string) =>
    [...createQueryKeys.metrics(), 'aggregated', timeRange] as const,
  
  // Infrastructure data
  infrastructure: () => [...createQueryKeys.all, 'infrastructure'] as const,
  servers: () => [...createQueryKeys.infrastructure(), 'servers'] as const,
  serverDetails: (serverId: string) =>
    [...createQueryKeys.servers(), 'details', serverId] as const,
  
  // Application monitoring
  applications: () => [...createQueryKeys.all, 'applications'] as const,
  appHealth: (appId: string) =>
    [...createQueryKeys.applications(), 'health', appId] as const,
  appLogs: (appId: string, level?: string) =>
    [...createQueryKeys.applications(), 'logs', appId, level] as const,
  
  // Alerts and notifications
  alerts: () => [...createQueryKeys.all, 'alerts'] as const,
  alertsList: (status?: string, severity?: string) =>
    [...createQueryKeys.alerts(), 'list', status, severity] as const,
  
  // User and settings
  user: () => [...createQueryKeys.all, 'user'] as const,
  userProfile: () => [...createQueryKeys.user(), 'profile'] as const,
  userSettings: () => [...createQueryKeys.user(), 'settings'] as const,
};

// Optimized query hooks with built-in performance features
export const useOptimizedQuery = <TData = unknown, TError = unknown>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> & {
    // Performance-specific options
    enableBackgroundRefetch?: boolean;
    prefetchOnMount?: boolean;
    staleTime?: number;
    cacheTime?: number;
  }
) => {
  const {
    enableBackgroundRefetch = false,
    prefetchOnMount = false,
    staleTime = 5 * 60 * 1000,
    cacheTime = 10 * 60 * 1000,
    ...queryOptions
  } = options || {};

  const queryClient = useQueryClient();

  // Prefetch on mount if requested
  useEffect(() => {
    if (prefetchOnMount) {
      queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime,
      });
    }
  }, [queryClient, queryKey, queryFn, prefetchOnMount, staleTime]);

  return useQuery({
    queryKey,
    queryFn,
    staleTime,
    gcTime: cacheTime,
    refetchInterval: enableBackgroundRefetch ? 30000 : false,
    ...queryOptions,
  });
};

// Optimized infinite query for large datasets
export const useOptimizedInfiniteQuery = <TData = unknown, TError = unknown>(
  queryKey: QueryKey,
  queryFn: ({ pageParam }: { pageParam: unknown }) => Promise<TData>,
  options?: {
    getNextPageParam?: (lastPage: TData, allPages: TData[]) => unknown;
    getPreviousPageParam?: (firstPage: TData, allPages: TData[]) => unknown;
    initialPageParam?: unknown;
    maxPages?: number;
    staleTime?: number;
    cacheTime?: number;
  }
) => {
  const {
    maxPages = 50,
    staleTime = 5 * 60 * 1000,
    cacheTime = 10 * 60 * 1000,
    ...infiniteOptions
  } = options || {};

  return useInfiniteQuery({
    queryKey,
    queryFn,
    staleTime,
    gcTime: cacheTime,
    maxPages,
    getNextPageParam: infiniteOptions.getNextPageParam || (() => undefined),
    getPreviousPageParam: infiniteOptions.getPreviousPageParam || (() => undefined),
    initialPageParam: infiniteOptions.initialPageParam || null,
    ...infiniteOptions,
  });
};

// Smart prefetching utilities
export const usePrefetchStrategies = () => {
  const queryClient = useQueryClient();

  // Prefetch critical dashboard data
  const prefetchDashboard = useCallback(async () => {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: createQueryKeys.dashboardData(),
        queryFn: () => fetch('/api/dashboard').then(res => res.json()),
        staleTime: 2 * 60 * 1000, // 2 minutes for dashboard
      }),
      queryClient.prefetchQuery({
        queryKey: createQueryKeys.metricsAggregated('24h'),
        queryFn: () => fetch('/api/metrics/aggregated?range=24h').then(res => res.json()),
        staleTime: 5 * 60 * 1000,
      }),
    ]);
  }, [queryClient]);

  // Prefetch on hover for navigation items
  const prefetchOnHover = useCallback((queryKey: QueryKey, queryFn: () => Promise<any>) => {
    return () => {
      queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime: 30000, // Short stale time for hover prefetch
      });
    };
  }, [queryClient]);

  // Prefetch related data based on current context
  const prefetchRelated = useCallback(async (context: {
    type: 'server' | 'application' | 'alert';
    id: string;
  }) => {
    const { type, id } = context;

    switch (type) {
      case 'server':
        await Promise.all([
          queryClient.prefetchQuery({
            queryKey: createQueryKeys.serverDetails(id),
            queryFn: () => fetch(`/api/servers/${id}`).then(res => res.json()),
          }),
          queryClient.prefetchQuery({
            queryKey: createQueryKeys.metricsTimeseries('1h', `server.${id}`),
            queryFn: () => fetch(`/api/metrics/timeseries?range=1h&target=server.${id}`).then(res => res.json()),
          }),
        ]);
        break;
      
      case 'application':
        await Promise.all([
          queryClient.prefetchQuery({
            queryKey: createQueryKeys.appHealth(id),
            queryFn: () => fetch(`/api/applications/${id}/health`).then(res => res.json()),
          }),
          queryClient.prefetchQuery({
            queryKey: createQueryKeys.appLogs(id, 'error'),
            queryFn: () => fetch(`/api/applications/${id}/logs?level=error`).then(res => res.json()),
          }),
        ]);
        break;
    }
  }, [queryClient]);

  return {
    prefetchDashboard,
    prefetchOnHover,
    prefetchRelated,
  };
};

// Optimized mutation with cache updates
export const useOptimizedMutation = <TData = unknown, TError = unknown, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, TError, TVariables, { previousData: Map<any, any> }> & {
    // Cache update strategies
    invalidateQueries?: QueryKey[];
    updateQueries?: Array<{
      queryKey: QueryKey;
      updateFn: (oldData: any, newData: TData) => any;
    }>;
    optimisticUpdates?: Array<{
      queryKey: QueryKey;
      updateFn: (variables: TVariables) => (oldData: any) => any;
    }>;
  }
) => {
  const {
    invalidateQueries = [],
    updateQueries = [],
    optimisticUpdates = [],
    ...mutationOptions
  } = options || {};

  const queryClient = useQueryClient();

  return useMutation<TData, TError, TVariables, { previousData: Map<any, any> }>({
    mutationFn,
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await Promise.all(
        [...invalidateQueries, ...updateQueries.map(u => u.queryKey)]
          .map(queryKey => queryClient.cancelQueries({ queryKey }))
      );

      // Snapshot previous values
      const previousData = new Map();
      
      // Apply optimistic updates
      optimisticUpdates.forEach(({ queryKey, updateFn }) => {
        const previousValue = queryClient.getQueryData(queryKey);
        previousData.set(queryKey, previousValue);
        
        queryClient.setQueryData(queryKey, updateFn(variables));
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousData) {
        context.previousData.forEach((value, queryKey) => {
          queryClient.setQueryData(queryKey, value);
        });
      }
      
      mutationOptions.onError?.(err, variables, context);
    },
    onSuccess: (data, variables, context) => {
      // Update specific queries
      updateQueries.forEach(({ queryKey, updateFn }) => {
        queryClient.setQueryData(queryKey, (oldData) => updateFn(oldData, data));
      });

      mutationOptions.onSuccess?.(data, variables, context);
    },
    onSettled: (data, error, variables, context) => {
      // Invalidate and refetch
      invalidateQueries.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
      });

      mutationOptions.onSettled?.(data, error, variables, context);
    },
    ...mutationOptions,
  });
};

// Background sync utilities
export const useBackgroundSync = (options: {
  enabled?: boolean;
  interval?: number;
  queryKeys?: QueryKey[];
}) => {
  const { enabled = true, interval = 30000, queryKeys = [] } = options;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const syncInterval = setInterval(() => {
      // Invalidate specific queries for background refresh
      queryKeys.forEach(queryKey => {
        queryClient.invalidateQueries({ 
          queryKey,
          refetchType: 'none' // Don't refetch immediately
        });
      });

      // Refetch stale queries in the background
      queryClient.refetchQueries({
        type: 'active',
        stale: true,
      });
    }, interval);

    return () => clearInterval(syncInterval);
  }, [enabled, interval, queryKeys, queryClient]);
};

// Memory optimization utilities
export const useQueryCacheOptimization = () => {
  const queryClient = useQueryClient();

  // Clear unused cache entries
  const clearUnusedCache = useCallback(() => {
    queryClient.getQueryCache().clear();
  }, [queryClient]);

  // Remove specific cache entries
  const removeQueries = useCallback((queryKeys: QueryKey[]) => {
    queryKeys.forEach(queryKey => {
      queryClient.removeQueries({ queryKey });
    });
  }, [queryClient]);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    return {
      totalQueries: queries.length,
      staleQueries: queries.filter(q => q.isStale()).length,
      activeQueries: queries.filter(q => q.getObserversCount() > 0).length,
      inactiveQueries: queries.filter(q => q.getObserversCount() === 0).length,
    };
  }, [queryClient]);

  // Cleanup stale queries automatically
  const cleanupStaleQueries = useCallback(() => {
    const queries = queryClient.getQueryCache().getAll();
    const staleInactiveQueries = queries.filter(
      query => query.isStale() && query.getObserversCount() === 0
    );

    staleInactiveQueries.forEach(query => {
      queryClient.removeQueries({ queryKey: query.queryKey });
    });
    
    return staleInactiveQueries.length;
  }, [queryClient]);

  return {
    clearUnusedCache,
    removeQueries,
    getCacheStats,
    cleanupStaleQueries,
  };
};

// Persisted queries for offline support
export const usePersistedQueries = (options: {
  persistedQueryKeys?: QueryKey[];
  maxAge?: number;
}) => {
  const { persistedQueryKeys = [], maxAge = 24 * 60 * 60 * 1000 } = options;
  const queryClient = useQueryClient();

  // Save critical queries to localStorage
  const persistQueries = useCallback(() => {
    persistedQueryKeys.forEach(queryKey => {
      const queryData = queryClient.getQueryData(queryKey);
      if (queryData) {
        const persistedData = {
          data: queryData,
          timestamp: Date.now(),
        };
        
        try {
          localStorage.setItem(
            `rq_${JSON.stringify(queryKey)}`,
            JSON.stringify(persistedData)
          );
        } catch (error) {
          console.warn('Failed to persist query data:', error);
        }
      }
    });
  }, [queryClient, persistedQueryKeys]);

  // Restore queries from localStorage
  const restoreQueries = useCallback(() => {
    persistedQueryKeys.forEach(queryKey => {
      try {
        const persistedDataStr = localStorage.getItem(`rq_${JSON.stringify(queryKey)}`);
        if (persistedDataStr) {
          const persistedData = JSON.parse(persistedDataStr);
          
          // Check if data is still valid
          if (Date.now() - persistedData.timestamp < maxAge) {
            queryClient.setQueryData(queryKey, persistedData.data);
          } else {
            // Remove expired data
            localStorage.removeItem(`rq_${JSON.stringify(queryKey)}`);
          }
        }
      } catch (error) {
        console.warn('Failed to restore query data:', error);
      }
    });
  }, [queryClient, persistedQueryKeys, maxAge]);

  // Auto-persist on data changes
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.query.state.data) {
        const queryKey = event.query.queryKey;
        if (persistedQueryKeys.some(key => JSON.stringify(key) === JSON.stringify(queryKey))) {
          persistQueries();
        }
      }
    });

    return unsubscribe;
  }, [queryClient, persistQueries, persistedQueryKeys]);

  return {
    persistQueries,
    restoreQueries,
  };
};

// Performance monitoring for React Query
export const useQueryPerformanceMonitoring = () => {
  const queryClient = useQueryClient();

  const monitorQueryPerformance = useCallback(() => {
    const cache = queryClient.getQueryCache();
    
    // Monitor query execution times
    const unsubscribe = cache.subscribe((event) => {
      if (event.type === 'updated' && event.query.state.status === 'success') {
        const query = event.query;
        const queryKey = JSON.stringify(query.queryKey);
        const executionTime = Date.now() - (query.state.dataUpdatedAt || 0);
        
        if (executionTime > 1000) {
          console.warn(`Slow query detected: ${queryKey} took ${executionTime}ms`);
        }
        
        // Log to performance monitoring service
        if (typeof window !== 'undefined' && window.performance) {
          performance.mark(`query-${queryKey}-end`);
          performance.measure(
            `query-${queryKey}`,
            `query-${queryKey}-start`,
            `query-${queryKey}-end`
          );
        }
      }
      
      if (event.type === 'updated' && event.query.state.status === 'pending') {
        const queryKey = JSON.stringify(event.query.queryKey);
        
        if (typeof window !== 'undefined' && window.performance) {
          performance.mark(`query-${queryKey}-start`);
        }
      }
    });

    return unsubscribe;
  }, [queryClient]);

  return { monitorQueryPerformance };
};

export default {
  createOptimizedQueryClient,
  createQueryKeys,
  useOptimizedQuery,
  useOptimizedInfiniteQuery,
  usePrefetchStrategies,
  useOptimizedMutation,
  useBackgroundSync,
  useQueryCacheOptimization,
  usePersistedQueries,
  useQueryPerformanceMonitoring,
}; 