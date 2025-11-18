'use client';

import { useEffect, useState } from 'react';
import { ClientLayout } from './ClientLayout';

interface HydratedLayoutProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

/**
 * HydratedLayout - Only renders ClientLayout after client-side hydration
 * This prevents any client component code from running during static generation
 */
export function HydratedLayout({ children, fallback }: HydratedLayoutProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Only after client-side hydration, render the full layout
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return <>{fallback}</>;
  }

  return <ClientLayout>{children}</ClientLayout>;
}

