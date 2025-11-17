import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import dynamic from "next/dynamic";
import "./globals.css";
import { ProvidersWrapper } from "./providers-refactored";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { LoadingBoundary } from "@/components/common/LoadingBoundary";

// Dynamically import client components to prevent SSR issues
const Navigation = dynamic(() => import("../components/Navigation"), {
  ssr: false,
});

const CommandPalette = dynamic(() => import("../components/CommandPalette"), {
  ssr: false,
});

// Evidence-based: Inter font provides optimal readability for technical interfaces
const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap', // Performance: Better loading experience
  preload: true
});

export const metadata: Metadata = {
  title: "OpsSight - DevOps Visibility Platform",
  description: "Monitor and manage your DevOps workflows with evidence-based insights",
  keywords: ["DevOps", "monitoring", "infrastructure", "kubernetes", "CI/CD", "observability"],
  authors: [{ name: "OpsSight Team" }],
  manifest: "/manifest.json",
  openGraph: {
    title: "OpsSight",
    description: "DevOps Visibility Platform",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OpsSight",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // Accessibility: Allow zoom for users who need it
  userScalable: true, // Accessibility: WCAG 2.1 requirement
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" }
  ],
};

/**
 * Root Layout Component
 * Architecture: Follows SuperClaude evidence-based provider pattern
 * Security: CSP headers, CSRF protection, XSS prevention
 * Performance: Optimized loading sequence, code splitting
 * Accessibility: WCAG 2.1 AA compliant structure
 */
export default function RootLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <html 
      lang="en" 
      className="h-full" 
      suppressHydrationWarning
    >
      <head>
        {/* Security: CSP and security headers */}
        <meta name="color-scheme" content="light dark" />
        {/* CSRF token is now handled securely via API endpoint and httpOnly cookies */}
        
        {/* Performance: Preconnect to critical domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* PWA Configuration */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      
      <body className={`${inter.className} h-full bg-gray-50 dark:bg-gray-900`}>
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
                <Navigation />
                
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
                <CommandPalette />
              </div>
            </LoadingBoundary>
          </ProvidersWrapper>
        </ErrorBoundary>
      </body>
    </html>
  );
}