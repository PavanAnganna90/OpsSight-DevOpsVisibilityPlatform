// Next.js 15 App Router: not-found.tsx is a special file
// Workaround: Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function NotFound() {
  return (
    <div>
      <h1>404</h1>
      <h2>Page Not Found</h2>
      <p>The page you're looking for doesn't exist.</p>
      <a href="/">Go back home</a>
    </div>
  );
}
