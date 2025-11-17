// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
      <div style={{ maxWidth: '28rem', width: '100%', textAlign: 'center', padding: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '3.75rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>404</h1>
          <h2 style={{ marginTop: '1rem', fontSize: '1.5rem', fontWeight: '600', color: '#111827' }}>
            Page Not Found
          </h2>
          <p style={{ marginTop: '0.5rem', color: '#4b5563' }}>
            The page you're looking for doesn't exist.
          </p>
        </div>
        <div style={{ marginTop: '2rem' }}>
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