/**
 * Unified SSO Login Page
 * 
 * Provides a centralized login experience with support for multiple
 * OAuth2 and SAML providers, with fallback to standard authentication.
 */

'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SSOLogin } from '@/components/auth/SSOLogin';

// Force dynamic rendering to avoid static generation
export const dynamic = 'force-dynamic';

export default function SSOPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get redirect URL from query params
  const redirectUrl = searchParams?.get('redirect') || '/dashboard';
  
  const handleSSOSuccess = (user: any) => {
    // Redirect to the intended destination
    router.push(redirectUrl);
  };

  const handleSSOError = (error: string) => {
    console.error('SSO authentication error:', error);
    // Could show error toast or redirect to error page
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <SSOLogin
        redirectUrl={redirectUrl}
        showTitle={true}
        onSuccess={handleSSOSuccess}
        onError={handleSSOError}
      />
    </div>
  );
}