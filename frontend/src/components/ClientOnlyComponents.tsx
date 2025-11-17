'use client';

import dynamic from 'next/dynamic';

// Dynamically import client components to prevent SSR issues
const Navigation = dynamic(() => import('./Navigation'), {
  ssr: false,
});

const CommandPalette = dynamic(() => import('./CommandPalette'), {
  ssr: false,
});

export function ClientOnlyNavigation() {
  return <Navigation />;
}

export function ClientOnlyCommandPalette() {
  return <CommandPalette />;
}

