import Link from 'next/link';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <html lang="en">
      <head>
        <title>404 - Page Not Found</title>
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, sans-serif' }}>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full space-y-8 text-center">
            <div>
              <h1 className="text-6xl font-bold text-gray-900 dark:text-white">404</h1>
              <h2 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-white">
                Page Not Found
              </h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                The page you're looking for doesn't exist.
              </p>
            </div>
            <div>
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
              >
                Go back home
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
} 