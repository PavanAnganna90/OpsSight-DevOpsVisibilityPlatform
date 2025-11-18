'use client';

import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { LoadingBoundary } from "@/components/common/LoadingBoundary";
import { ProvidersWrapper } from "../app/providers-refactored";
import { ClientOnlyNavigation, ClientOnlyCommandPalette } from "./ClientOnlyComponents";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <ErrorBoundary>
      <ProvidersWrapper>
        <LoadingBoundary>
          <div className="min-h-screen flex flex-col">
            {/* Skip to main content for accessibility */}
            <a 
              href="#main-content" 
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded"
            >
              Skip to main content
            </a>
            
            {/* Navigation */}
            <ClientOnlyNavigation />
            
            {/* Main content area with semantic HTML */}
            <main 
              id="main-content"
              role="main"
              className="flex-1"
              tabIndex={-1}
            >
              {children}
            </main>
            
            {/* Command palette for power users */}
            <ClientOnlyCommandPalette />
          </div>
        </LoadingBoundary>
      </ProvidersWrapper>
    </ErrorBoundary>
  );
}

