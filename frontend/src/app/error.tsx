'use client'

import { useEffect } from 'react'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
      <div style={{ maxWidth: '28rem', width: '100%', textAlign: 'center', padding: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '3rem', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>Error</h1>
          <h2 style={{ marginTop: '1rem', fontSize: '1.5rem', fontWeight: '600', color: '#111827' }}>
            Something went wrong!
          </h2>
          <p style={{ marginTop: '0.5rem', color: '#4b5563' }}>
            We apologize for the inconvenience. Please try again.
          </p>
        </div>
        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={reset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              borderRadius: '0.375rem',
              color: 'white',
              backgroundColor: '#dc2626',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              borderRadius: '0.375rem',
              color: '#374151',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              textDecoration: 'none'
            }}
          >
            Go back home
          </a>
        </div>
      </div>
    </div>
  )
}
