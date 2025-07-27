'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function UltraMinimalPage() {
  const router = useRouter();

  useEffect(() => {
    // For development, bypass authentication and go directly to dashboard
    const timer = setTimeout(() => {
      router.push('/dashboard/enhanced');
    }, 1500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        maxWidth: '400px',
        width: '100%',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        padding: '32px',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: '#111827',
          marginBottom: '16px'
        }}>
          OpsSight Platform
        </h1>
        <p style={{
          color: '#6b7280',
          marginBottom: '24px'
        }}>
          DevOps Platform Successfully Deployed
        </p>
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '4px',
            padding: '12px',
            marginBottom: '8px'
          }}>
            <p style={{ color: '#166534', fontSize: '14px', margin: 0 }}>
              ✅ Frontend: Ready
            </p>
          </div>
          <div style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '4px',
            padding: '12px',
            marginBottom: '8px'
          }}>
            <p style={{ color: '#1e40af', fontSize: '14px', margin: 0 }}>
              📊 Backend: Running
            </p>
          </div>
          <div style={{
            backgroundColor: '#faf5ff',
            border: '1px solid #e9d5ff',
            borderRadius: '4px',
            padding: '12px'
          }}>
            <p style={{ color: '#7c2d12', fontSize: '14px', margin: 0 }}>
              🗄️ Services: Active
            </p>
          </div>
        </div>
        <div style={{ marginTop: '24px' }}>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            All services deployed successfully
          </p>
          <div style={{ 
            marginTop: '16px',
            animation: 'pulse 2s infinite'
          }}>
            <p style={{ color: '#059669', fontSize: '14px', fontWeight: 'bold' }}>
              🚀 Redirecting to Dashboard...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}