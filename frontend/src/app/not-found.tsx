'use client'

// Force dynamic rendering - this page should never be statically generated
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Simple 404 page component - client component to prevent static generation
// Note: In Next.js app router, not-found.tsx should NOT include <html> or <body> tags
export default function NotFound() {
  // Return simple JSX - no imports to avoid static generation issues
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
      <div style={{ maxWidth: '28rem', width: '100%', textAlign: 'center', padding: '2rem' }}>
        <h1 style={{ fontSize: '3.75rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>404</h1>
        <h2 style={{ marginTop: '1rem', fontSize: '1.5rem', fontWeight: '600', color: '#111827' }}>
          Page Not Found
        </h2>
        <p style={{ marginTop: '0.5rem', color: '#4b5563', marginBottom: '2rem' }}>
          The page you're looking for doesn't exist.
        </p>
        <a
          href="/"
          style={{
            display: 'inline-block',
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
  );
}
