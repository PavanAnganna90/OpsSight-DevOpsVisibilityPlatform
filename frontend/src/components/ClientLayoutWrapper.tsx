'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import ClientLayout only after client-side hydration
const ClientLayout = dynamic(() => import('./ClientLayout').then(mod => ({ default: mod.ClientLayout })), {
  ssr: false,
});

interface ClientLayoutWrapperProps {
  children: React.ReactNode;
}

/**
 * ClientLayoutWrapper - Wraps children with ClientLayout only after hydration
 * This ensures ClientLayout is never evaluated during static generation
 */
export function ClientLayoutWrapper({ children }: ClientLayoutWrapperProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Mark as hydrated after client-side mount
    setIsHydrated(true);
  }, []);

  // During SSR/static generation, render nothing (children are already in layout)
  // After hydration, wrap with ClientLayout for full functionality
  if (!isHydrated) {
    return null;
  }

  return <ClientLayout>{children}</ClientLayout>;
}

