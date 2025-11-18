// Force dynamic rendering - this page should never be statically generated
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Simple 404 page component - server component in Next.js app router
// Note: In Next.js app router, not-found.tsx should NOT include <html> or <body> tags
export default function NotFound() {
  // Return simple JSX without any complex structures
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center p-8">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          Page Not Found
        </h2>
        <p className="text-gray-600 mb-8">
          The page you're looking for doesn't exist.
        </p>
        <a
          href="/"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
        >
          Go back home
        </a>
      </div>
    </div>
  );
}
