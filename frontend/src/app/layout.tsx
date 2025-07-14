import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '../components/ui/Toast';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { ServiceWorkerProvider } from '@/components/providers/ServiceWorkerProvider';
import { SecurityProvider } from '@/components/providers/SecurityProvider';
import { MonitoringProvider } from '@/components/providers/MonitoringProvider';
import Navigation from '../components/Navigation';
import CommandPalette from '../components/CommandPalette';

// Reason: Use Inter font for consistent typography across the app
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OpsSight - DevOps Visibility Platform",
  description: "Monitor and manage your DevOps workflows with ease",
  // Add more metadata for better SEO
  keywords: "DevOps, monitoring, infrastructure, kubernetes, CI/CD",
  authors: [{ name: "OpsSight Team" }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

/**
 * Root layout component that wraps all pages.
 * Provides consistent layout structure with navigation and main content area.
 *
 * @param {RootLayoutProps} props - Component props
 * @param {ReactNode} props.children - Child components to render in main content area
 * @returns {React.ReactElement} Root layout structure
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <meta name="csrf-token" content="generated-by-security-provider" />
      </head>
      <body className={`${inter.className} h-full bg-gray-50 dark:bg-gray-900`}>
        <QueryProvider>
          <MonitoringProvider>
            <SecurityProvider>
              <AuthProvider>
                <ThemeProvider>
                  <ToastProvider>
                    <ServiceWorkerProvider>
                      <div className="min-h-full">
                        <Navigation />
                        <main className="bg-gray-50 dark:bg-gray-900">
                          {children}
                        </main>
                        <CommandPalette />
                      </div>
                    </ServiceWorkerProvider>
                  </ToastProvider>
                </ThemeProvider>
              </AuthProvider>
            </SecurityProvider>
          </MonitoringProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
