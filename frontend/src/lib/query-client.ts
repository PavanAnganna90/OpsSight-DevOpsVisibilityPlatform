import { QueryClient } from '@tanstack/react-query'

/**
 * Query Client Configuration
 * 
 * Configured for SSR compatibility with Next.js 15
 * Based on latest TanStack Query v5 best practices
 */

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 60 * 1000, // 1 minute
        gcTime: 1000 * 60 * 60 * 24, // 24 hours (renamed from cacheTime in v5)
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors except for 401 and 403
          if (error?.response?.status >= 400 && error?.response?.status < 500) {
            if (error.response.status === 401 || error.response.status === 403) {
              return failureCount < 1 // Only retry once for auth errors
            }
            return false
          }
          // Retry up to 3 times for other errors
          return failureCount < 3
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Enable background refetching
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        // Disable retries for server-side rendering
        ...(typeof window === 'undefined' && {
          retry: false,
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
        }),
      },
      mutations: {
        retry: 1, // Retry mutations once
        retryDelay: 1000, // 1 second delay between retries
      },
    },
  })
}

// Create a stable query client instance
let clientSingleton: QueryClient | undefined

export function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return createQueryClient()
  } else {
    // Browser: use singleton pattern to keep the same query client
    return (clientSingleton ??= createQueryClient())
  }
} 