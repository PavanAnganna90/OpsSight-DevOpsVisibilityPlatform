'use client'

// Force dynamic rendering - this page should never be statically generated
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Simple 500 page component - must be a client component to prevent static generation
export default function Custom500() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
      <div style={{ maxWidth: '28rem', width: '100%', textAlign: 'center', padding: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '3.75rem', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>500</h1>
          <h2 style={{ marginTop: '1rem', fontSize: '1.5rem', fontWeight: '600', color: '#111827' }}>
            Server Error
          </h2>
          <p style={{ marginTop: '0.5rem', color: '#4b5563' }}>
            We're sorry, but something went wrong on our end. Our team has been notified and is working to fix the issue.
          </p>
        </div>
        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
          <a
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              borderRadius: '0.375rem',
              color: 'white',
              backgroundColor: '#2563eb',
              textDecoration: 'none'
            }}
          >
            Go back home
          </a>
        </div>
      </div>
    </div>
  );
}

