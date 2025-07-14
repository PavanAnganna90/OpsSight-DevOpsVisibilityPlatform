import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'

/**
 * API Types for Metrics
 */
interface MetricData {
  id: string
  name: string
  value: number
  unit: string
  timestamp: string
  status: 'healthy' | 'warning' | 'critical'
  metadata?: Record<string, any>
}

interface SystemHealthMetrics {
  cpu_usage: number
  memory_usage: number
  disk_usage: number
  network_in: number
  network_out: number
  uptime: number
  error_rate: number
  response_time: number
  active_connections: number
  timestamp: string
}

interface DashboardMetrics {
  system_status: 'healthy' | 'warning' | 'critical'
  total_deployments: number
  successful_deployments: number
  failed_deployments: number
  avg_deployment_time: number
  total_costs: number
  daily_costs: number
  cost_trend: number
  resource_utilization: number
  alerts_count: number
  recent_deployments: Array<{
    id: string
    service: string
    status: string
    timestamp: string
    environment: string
  }>
}

/**
 * Query Keys Factory
 * Centralized query key management for consistency
 */
export const metricsQueryKeys = {
  all: ['metrics'] as const,
  lists: () => [...metricsQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...metricsQueryKeys.lists(), { filters }] as const,
  details: () => [...metricsQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...metricsQueryKeys.details(), id] as const,
  systemHealth: () => [...metricsQueryKeys.all, 'system-health'] as const,
  dashboard: () => [...metricsQueryKeys.all, 'dashboard'] as const,
  realtime: (metricType: string) => [...metricsQueryKeys.all, 'realtime', metricType] as const,
}

/**
 * API Functions
 */
async function fetchSystemHealth(): Promise<SystemHealthMetrics> {
  const response = await fetch('/api/v1/metrics/system-health', {
    credentials: 'include',
  })
  
  if (!response.ok) {
    throw new Error(`Failed to fetch system health: ${response.status}`)
  }
  
  return response.json()
}

async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const response = await fetch('/api/v1/metrics/dashboard', {
    credentials: 'include',
  })
  
  if (!response.ok) {
    throw new Error(`Failed to fetch dashboard metrics: ${response.status}`)
  }
  
  return response.json()
}

async function fetchMetricsList(filters: Record<string, any> = {}): Promise<MetricData[]> {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.set(key, String(value))
    }
  })
  
  const queryString = params.toString()
  const url = `/api/v1/metrics${queryString ? `?${queryString}` : ''}`
  
  const response = await fetch(url, {
    credentials: 'include',
  })
  
  if (!response.ok) {
    throw new Error(`Failed to fetch metrics: ${response.status}`)
  }
  
  const data = await response.json()
  return data.metrics || []
}

async function createMetric(metricData: Omit<MetricData, 'id' | 'timestamp'>): Promise<MetricData> {
  const response = await fetch('/api/v1/metrics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(metricData),
  })
  
  if (!response.ok) {
    throw new Error(`Failed to create metric: ${response.status}`)
  }
  
  return response.json()
}

/**
 * React Query Hooks
 */

/**
 * Hook to fetch system health metrics
 * Updates every 30 seconds for real-time monitoring
 */
export function useSystemHealth() {
  const { state: authState } = useAuth()
  
  return useQuery({
    queryKey: metricsQueryKeys.systemHealth(),
    queryFn: fetchSystemHealth,
    enabled: authState.isAuthenticated,
    refetchInterval: 30 * 1000, // 30 seconds
    refetchIntervalInBackground: true,
    staleTime: 20 * 1000, // Consider fresh for 20 seconds
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false
      }
      return failureCount < 3
    },
  })
}

/**
 * Hook to fetch dashboard overview metrics
 * Updates every 2 minutes for less critical data
 */
export function useDashboardMetrics() {
  const { state: authState } = useAuth()
  
  return useQuery({
    queryKey: metricsQueryKeys.dashboard(),
    queryFn: fetchDashboardMetrics,
    enabled: authState.isAuthenticated,
    refetchInterval: 2 * 60 * 1000, // 2 minutes
    staleTime: 60 * 1000, // Consider fresh for 1 minute
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false
      }
      return failureCount < 2
    },
  })
}

/**
 * Hook to fetch paginated/filtered metrics list
 */
export function useMetricsList(filters: Record<string, any> = {}) {
  const { state: authState } = useAuth()
  
  return useQuery({
    queryKey: metricsQueryKeys.list(filters),
    queryFn: () => fetchMetricsList(filters),
    enabled: authState.isAuthenticated,
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    retry: 2,
  })
}

/**
 * Mutation hook to create new metrics
 * Optimistically updates the cache
 */
export function useCreateMetric() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: createMetric,
    onSuccess: (newMetric) => {
      // Optimistically update the metrics list
      queryClient.setQueryData(
        metricsQueryKeys.lists(),
        (oldData: MetricData[] | undefined) => {
          if (!oldData) return [newMetric]
          return [newMetric, ...oldData]
        }
      )
      
      // Invalidate related queries to refetch fresh data
      queryClient.invalidateQueries({
        queryKey: metricsQueryKeys.lists(),
      })
      
      queryClient.invalidateQueries({
        queryKey: metricsQueryKeys.dashboard(),
      })
    },
    onError: (error) => {
      console.error('Failed to create metric:', error)
      // Could add toast notification here
    },
  })
}

/**
 * Hook for real-time metric subscriptions
 * Uses polling as a fallback for WebSocket-like behavior
 */
export function useRealtimeMetric(metricType: string, enabled: boolean = true) {
  const { state: authState } = useAuth()
  
  return useQuery({
    queryKey: metricsQueryKeys.realtime(metricType),
    queryFn: () => fetchMetricsList({ type: metricType, limit: 1 }),
    enabled: authState.isAuthenticated && enabled,
    refetchInterval: 5 * 1000, // 5 seconds for real-time feel
    refetchIntervalInBackground: false, // Stop when tab is not active
    staleTime: 0, // Always consider stale for real-time data
    retry: 1,
    select: (data) => data[0] || null, // Get the latest metric
  })
}

/**
 * Utility hook to prefetch metrics data
 * Useful for preloading data on route transitions
 */
export function usePrefetchMetrics() {
  const queryClient = useQueryClient()
  const { state: authState } = useAuth()
  
  const prefetchSystemHealth = () => {
    if (!authState.isAuthenticated) return
    
    queryClient.prefetchQuery({
      queryKey: metricsQueryKeys.systemHealth(),
      queryFn: fetchSystemHealth,
      staleTime: 30 * 1000,
    })
  }
  
  const prefetchDashboardMetrics = () => {
    if (!authState.isAuthenticated) return
    
    queryClient.prefetchQuery({
      queryKey: metricsQueryKeys.dashboard(),
      queryFn: fetchDashboardMetrics,
      staleTime: 60 * 1000,
    })
  }
  
  return {
    prefetchSystemHealth,
    prefetchDashboardMetrics,
  }
} 