'use client'

import React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { getQueryClient } from '@/lib/query-client'

interface QueryProviderProps {
  children: React.ReactNode
}

/**
 * Query Provider Component
 * 
 * Provides React Query context to the application
 * Includes devtools in development mode
 * Based on TanStack Query v5 best practices for Next.js 15
 */
export function QueryProvider({ children }: QueryProviderProps) {
  // Initialize query client using singleton pattern for browser
  // and fresh instance for server (SSR)
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Enable devtools only in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-left"
          position="bottom"
        />
      )}
    </QueryClientProvider>
  )
} 